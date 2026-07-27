import mongoose from "mongoose";

const MeasurementSchema = new mongoose.Schema({
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  timestamp: { type: Date, required: true },
  fecha: { type: String, required: true },        // 'YYYY-MM-DD'
  horaMinuto: { type: String, required: true },   // 'HH:MM'
  diaSemana: { type: String, required: true },    // 'Lunes', 'Martes', etc.
  demandaKw: { type: Number, required: true },    // Convertido a kW (Eptot+)
  reactivaIndKvar: { type: Number, required: true }, // NUEVO: Convertido a kvar (Ntotind+)
  reactivaCapKvar: { type: Number, required: true }  // NUEVO: Convertido a kvar (Ntotcap+)
});

// Índice compuesto para evitar registros duplicados del mismo punto y hora
MeasurementSchema.index({ boardId: 1, timestamp: 1 }, { unique: true });

const MeasurementModel = mongoose.model('Measurement', MeasurementSchema);
export default MeasurementModel;