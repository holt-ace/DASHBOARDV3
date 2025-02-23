import mongoose from "mongoose";

// Create the model using MongoDB schema validation
const poSchema = new mongoose.Schema(
  {
    // Use core schema structure directly
    header: {
      type: Object,
      required: true,
    },
    products: {
      type: Array,
      required: true,
    },
    weights: {
      type: Object,
      required: true,
    },
    totalCost: {
      type: Number,
      required: true,
    },
    revision: {
      type: Number,
      default: 1,
    },
    revisionInfo: {
      type: String,
    },
    notes: {
      type: String,
    },
    history: {
      type: Array,
    },
  },
  {
    timestamps: true,
    strict: true, // Reject fields not in schema
    collection: 'purchase_orders' // Explicitly set collection name
  }
);

// Add indexes
poSchema.index({ "header.poNumber": 1 }, { unique: true });
poSchema.index({ "header.status": 1 });
poSchema.index({ createdAt: 1 });

const PO = mongoose.model("PurchaseOrder", poSchema);

export default PO;
