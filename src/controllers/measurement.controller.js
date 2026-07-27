// controllers/measurement.controller.js
import Measurement from '../models/Measurement.js';
import mongoose from "mongoose"

// Función auxiliar para normalizar y parsear los floats con formatos regionales del Metrel
const parseMetrelFloat = (textoRaw) => {
  if (!textoRaw) return 0;
  let limpio = textoRaw.replace(/[^\d.,-]/g, '');
  if (limpio.includes(',') && limpio.includes('.')) {
    limpio = limpio.replace(/,/g, ''); // Remover separador de miles
  } else if (limpio.includes(',') && !limpio.includes('.')) {
    limpio = limpio.replace(/,/g, '.'); // Cambiar coma decimal a punto
  }
  const valor = parseFloat(limpio);
  return isNaN(valor) ? 0 : valor;
};

// A. IMPORTACIÓN COMPLETA REESTRUCTURADA
export const importMetrel = async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Buffer vacío.' });

    const csvTexto = req.file.buffer.toString('utf-8');
    const lineas = csvTexto.split(/\r?\n/);
    const datosProcesados = [];
    const diasInEsp = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].trim();
      if (!linea) continue;

      const columnas = linea.replace(/"/g, '').split(';');
      if (columnas[0].includes('Hora') || columnas[0].includes('Med')) continue;

      // Garantizamos que existan las columnas de Potencia Activa y Reactivas
      if (columnas.length >= 4) {
        const rawTime = columnas[0].trim();
        
        const rawWh = parseMetrelFloat(columnas[1]);   // Eptot+ (Wh)
        const rawVarCap = parseMetrelFloat(columnas[2]); // Ntotcap+ (var)
        const rawVarInd = parseMetrelFloat(columnas[3]); // Ntotind+ (var)

        if (rawTime) {
          const [fechaParte, horaParte] = rawTime.split(' ');
          const [diaStr, mesStr, añoStr] = fechaParte.split('/');
          const [horaStr, minutoStr] = horaParte.split(':');

          let horaInt = parseInt(horaStr);
          let minutoInt = parseInt(minutoStr);
          let minutoRedondeado = Math.round(minutoInt / 5) * 5;

          if (minutoRedondeado === 60) {
            minutoRedondeado = 0;
            horaInt += 1;
          }
          if (horaInt === 24) horaInt = 0;

          const hora = String(horaInt).padStart(2, '0');
          const minuto = String(minutoRedondeado).padStart(2, '0');
          
          const horaMinuto = `${hora}:${minuto}`; 
          const fecha = `${añoStr}-${mesStr.padStart(2, '0')}-${diaStr.padStart(2, '0')}`;
          const timestampNeutro = new Date(`${fecha}T${hora}:${minuto}:00.000Z`);
          const diaSemana = diasInEsp[timestampNeutro.getUTCDay()];

          // Conversiones eléctricas correspondientes
          const kw = (rawWh * 12) / 1000;
          const kvarCap = rawVarCap / 1000;
          const kvarInd = rawVarInd / 1000;

          datosProcesados.push({
            boardId,
            timestamp: timestampNeutro,
            fecha,
            horaMinuto,
            diaSemana,
            demandaKw: Number(kw.toFixed(2)),
            reactivaCapKvar: Number(kvarCap.toFixed(2)),
            reactivaIndKvar: Number(kvarInd.toFixed(2))
          });
        }
      }
    }

    if (datosProcesados.length > 0) {
      // Limpieza e inserción masiva segura
      await Measurement.deleteMany({ boardId });
      await Measurement.bulkWrite(
        datosProcesados.map(doc => ({
          updateOne: {
            filter: { boardId, timestamp: doc.timestamp },
            update: { $set: doc },
            upsert: true
          }
        }))
      );
    }

    return res.status(200).json({ success: true, count: datosProcesados.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// B. CONSULTA EXTENDIDA PARA ENVIAR LAS TRES VARIABLES AGROPADAS POR DÍA
export const chartData = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    const limites = await Measurement.aggregate([
      { $match: { boardId: new mongoose.Types.ObjectId(boardId) } },
      { $group: { _id: null, min: { $min: "$fecha" }, max: { $max: "$fecha" } } }
    ]);

    const minFechaDisponible = limites[0]?.min || "2026-06-20";
    const maxFechaDisponible = limites[0]?.max || "2026-06-30";

    const query = { boardId };
    if (fechaInicio && fechaFin) {
      query.fecha = { $gte: fechaInicio, $lte: fechaFin };
    } else {
      query.fecha = { $gte: minFechaDisponible, $lte: maxFechaDisponible };
    }

    const datos = await Measurement.find(query).sort({ horaMinuto: 1 });

    // Estructuras de respuesta separadas para que el front las mapee sin cruzar data
    const agrupadoActiva = {};
    const agrupadoReactivaInd = {};
    const agrupadoReactivaCap = {};

    datos.forEach(item => {
      const key = `${item.fecha} (${item.diaSemana})`;
      
      if (!agrupadoActiva[key]) agrupadoActiva[key] = {};
      if (!agrupadoReactivaInd[key]) agrupadoReactivaInd[key] = {};
      if (!agrupadoReactivaCap[key]) agrupadoReactivaCap[key] = {};

      agrupadoActiva[key][item.horaMinuto] = item.demandaKw;
      agrupadoReactivaInd[key][item.horaMinuto] = item.reactivaIndKvar;
      agrupadoReactivaCap[key][item.horaMinuto] = item.reactivaCapKvar;
    });

    return res.json({
      agrupado: agrupadoActiva, 
      agrupadoReactivaInd,
      agrupadoReactivaCap,
      minFecha: minFechaDisponible,
      maxFecha: maxFechaDisponible
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};