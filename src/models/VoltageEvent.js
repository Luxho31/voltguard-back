import mongoose from "mongoose";

const VoltageEventSchema = new mongoose.Schema({
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  tipoEvento: { type: String, required: true },
  horaInicio: { type: String },
  horaFinalizacion: { type: String },
  duracionSegundos: { type: Number, required: true },
  fase: { type: String },
  tensionResidual: { type: Number, required: true }
}, { 
  timestamps: true 
});

// Índice para consultas rápidas por tablero
VoltageEventSchema.index({ boardId: 1 });

const VoltageEventModel = mongoose.model('VoltageEvent', VoltageEventSchema);
export default VoltageEventModel;