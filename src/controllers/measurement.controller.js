// controllers/measurement.controller.js
import Measurement from '../models/Measurement.js';
import mongoose from "mongoose"

// A. IMPORTACIÓN COMPLETA (Guarda absolutamente todo lo que venga en el archivo)
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

      if (columnas.length >= 2) {
        const rawTime = columnas[0].trim();
        let WhTextoLimpio = columnas[1].replace(/[^\d.,-]/g, ''); 
        
        if (WhTextoLimpio.includes(',') && WhTextoLimpio.includes('.')) {
          WhTextoLimpio = WhTextoLimpio.replace(/,/g, '');
        } else if (WhTextoLimpio.includes(',') && !WhTextoLimpio.includes('.')) {
          WhTextoLimpio = WhTextoLimpio.replace(/,/g, '.');
        }

        const rawWh = parseFloat(WhTextoLimpio);

        if (rawTime && !isNaN(rawWh)) {
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

          const kw = (rawWh * 12) / 1000;

          datosProcesados.push({
            boardId,
            timestamp: timestampNeutro,
            fecha,
            horaMinuto,
            diaSemana,
            demandaKw: Number((kw).toFixed(2))
          });
        }
      }
    }

    if (datosProcesados.length > 0) {
      // Limpieza preventiva automática al importar un archivo nuevo
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

// B. CONSULTA FILTRADA DINÁMICAMENTE POR RANGO DE FECHAS
export const chartData = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    // 1. Encontrar dinámicamente los límites reales absolutos de la data cargada
    const limites = await Measurement.aggregate([
      { $match: { boardId: new mongoose.Types.ObjectId(boardId) } },
      { $group: { _id: null, min: { $min: "$fecha" }, max: { $max: "$fecha" } } }
    ]);

    const minFechaDisponible = limites[0]?.min || "2026-06-20";
    const maxFechaDisponible = limites[0]?.max || "2026-06-30";

    // 2. Construir la consulta de filtrado dinámico
    const query = { boardId };
    if (fechaInicio && fechaFin) {
      query.fecha = { $gte: fechaInicio, $lte: fechaFin };
    } else {
      // 🔥 SOLUCIÓN: Carga TODOS los días registrados por defecto al abrir la vista
      query.fecha = { $gte: minFechaDisponible, $lte: maxFechaDisponible };
    }

    const datos = await Measurement.find(query).sort({ horaMinuto: 1 });

    const agrupado = {};
    datos.forEach(item => {
      const key = `${item.fecha} (${item.diaSemana})`;
      if (!agrupado[key]) agrupado[key] = {};
      agrupado[key][item.horaMinuto] = item.demandaKw;
    });

    return res.json({
      agrupado,
      minFecha: minFechaDisponible,
      maxFecha: maxFechaDisponible
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};