import VoltageEvent from '../models/VoltageEvent.js';

// ── UTILIDAD PARA PARSEAR LA DURACIÓN DE METREL A SEGUNDOS ──
const parseMetrelDuration = (durStr) => {
  if (!durStr) return 0;
  let days = 0;
  let rest = durStr.trim();

  // 1. Detectar si el formato incluye días (Ej: "4.22:01:37.467")
  const firstColon = rest.indexOf(':');
  const firstDot = rest.indexOf('.');
  
  if (firstDot > -1 && firstColon > -1 && firstDot < firstColon) {
    // Hay un punto antes de los dos puntos -> Indica DÍAS
    days = parseInt(rest.split('.')[0]) || 0;
    rest = rest.substring(firstDot + 1); // Extrae solo "HH:MM:SS.mmm"
  }

  // 2. Procesar Horas, Minutos y Segundos
  const timeParts = rest.split(':');
  let hours = 0, minutes = 0, seconds = 0;

  if (timeParts.length === 3) {
    hours = parseInt(timeParts[0]) || 0;
    minutes = parseInt(timeParts[1]) || 0;
    seconds = parseFloat(timeParts[2]) || 0;
  } else if (timeParts.length === 2) {
    minutes = parseInt(timeParts[0]) || 0;
    seconds = parseFloat(timeParts[1]) || 0;
  } else if (timeParts.length === 1) {
    seconds = parseFloat(timeParts[0]) || 0;
  }

  // Retornar la duración total estrictamente en segundos flotantes
  return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
};

// ── IMPORTACIÓN DEL CSV (SUBIDA) ──
export const uploadIticCsv = async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No se ha detectado ningún archivo CSV.' });
    }

    // Leemos en 'latin1' o 'utf-8' dependiendo de la exportación de Windows/Metrel
    let csvTexto = req.file.buffer.toString('utf-8');
    if (csvTexto.includes('ï»¿')) {
      csvTexto = csvTexto.replace('ï»¿', ''); // Remover BOM si existe
    }

    const lineas = csvTexto.split(/\r?\n/);
    const eventosProcesados = [];
    let colIndices = null;

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].trim();
      if (!linea) continue;

      const columnas = linea.replace(/"/g, '').split(';');
      const lineaLower = linea.toLowerCase();

      // Detección dinámica de cabeceras
      if (!colIndices && lineaLower.includes('tipo') && lineaLower.includes('duraci')) {
        colIndices = {
          tipo: columnas.findIndex(c => c.toLowerCase().includes('tipo de evento')),
          inicio: columnas.findIndex(c => c.toLowerCase().includes('inicio')),
          fin: columnas.findIndex(c => c.toLowerCase().includes('finaliza')),
          duracion: columnas.findIndex(c => c.toLowerCase().includes('duraci')),
          fase: columnas.findIndex(c => c.toLowerCase().includes('fase')),
          tension: columnas.findIndex(c => c.toLowerCase().includes('tensi'))
        };
        continue;
      }

      // Si aún no hay cabecera o la fila no tiene columnas suficientes, saltar
      if (!colIndices || columnas.length < 5) continue;

      const tipoEvento = columnas[colIndices.tipo]?.trim();
      const duracionRaw = columnas[colIndices.duracion]?.trim();
      const tensionRaw = columnas[colIndices.tension]?.trim();

      if (!tipoEvento || !duracionRaw) continue;

      const duracionSegundos = parseMetrelDuration(duracionRaw);
      let tensionResidual = parseFloat(tensionRaw.replace(',', '.'));
      if (isNaN(tensionResidual)) tensionResidual = 0;

      eventosProcesados.push({
        boardId,
        tipoEvento,
        horaInicio: columnas[colIndices.inicio]?.trim() || "",
        horaFinalizacion: columnas[colIndices.fin]?.trim() || "",
        duracionSegundos: Number(duracionSegundos.toFixed(4)),
        fase: columnas[colIndices.fase]?.trim() || "Desconocida",
        tensionResidual: Number(tensionResidual.toFixed(2))
      });
    }

    if (eventosProcesados.length > 0) {
      // Limpiar historial anterior de este tablero e insertar la nueva corrida completa
      await VoltageEvent.deleteMany({ boardId });
      await VoltageEvent.insertMany(eventosProcesados);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Eventos ITIC cargados con éxito',
      count: eventosProcesados.length 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ── OBTENCIÓN DE DATOS (PARA EL FRONTEND) ──
export const getIticEvents = async (req, res) => {
  try {
    const { boardId } = req.params;
    
    // Obtenemos todos los eventos asociados al tablero
    const events = await VoltageEvent.find({ boardId })
      .select('tipoEvento horaInicio duracionSegundos fase tensionResidual -_id')
      .lean();

    return res.status(200).json({ success: true, events });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};