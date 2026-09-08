import mongoose from "mongoose";

const MeasurementSchema = new mongoose.Schema({
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  timestamp: { type: Date, required: true },
  fecha: { type: String, required: true },         // 'YYYY-MM-DD'
  horaMinuto: { type: String, required: true },    // 'HH:MM'
  diaSemana: { type: String, required: true },     // 'Lunes', 'Martes', etc.
  demandaKw: { type: Number, required: true },     // Convertido a kW (Eptot+)
  reactivaIndKvar: { type: Number, required: true }, // Convertido a kvar (Ntotind+)
  reactivaCapKvar: { type: Number, required: true }, // Convertido a kvar (Ntotcap+)
  // ── CAMPOS NUEVOS PARA DISTORSIÓN ARMÓNICA ──
  thdVoltaje: { type: Number, default: 0 },        // Promedio (THDu1 + THDu2 + THDu3) / 3 en %
  thdCorriente: { type: Number, default: 0 }       // Promedio (THDi1 + THDi2 + THDi3) / 3 en %
});

MeasurementSchema.index({ boardId: 1, timestamp: 1 }, { unique: true });

const MeasurementModel = mongoose.model('Measurement', MeasurementSchema);
export default MeasurementModel;