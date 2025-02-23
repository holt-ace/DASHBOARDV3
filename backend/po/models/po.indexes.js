const poIndexes = (poSchema) => {
  poSchema.index({
    poNumber: "text",
    "buyerInfo.name": "text",
    "syscoLocation.name": "text",
  });
};

export default poIndexes;