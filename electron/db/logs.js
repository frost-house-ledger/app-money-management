export function createInputLogger(insertInputLogStmt) {
  return function logInput(record) {
    insertInputLogStmt.run({
      source: record.source,
      action: record.action || "add",
      type: record.type,
      title: record.title,
      amount: record.amount,
      targetDate: record.targetDate,
      categoryId: record.categoryId || null,
      category: record.category || null,
      note: record.note || null,
      payloadJson: JSON.stringify(record.payload || {})
    });
  };
}
