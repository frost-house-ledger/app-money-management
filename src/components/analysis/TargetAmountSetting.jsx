
import React from "react";
import currencyData from "../../../json/currency.json";

export default function TargetAmountSetting({
  mergedRows,
  targets,
  handleTargetChange,
  handleSaveTargets,
  saving,
  saveMessage,
  selectedCurrency,
  exchangeRates,
  formatCurrency,
  onBack
}) {
  // Get currency icon from JSON data
  const getCurrencyIcon = (currencyCode) => {
    const currency = currencyData.items.find(item => item.code === currencyCode);
    return currency ? currency.icon : currencyCode;
  };

  return (
    <>
      <section className="card">
        <div style={{ display: "flex", alignItems: "left", justifyContent: "space-between", marginBottom: 20 }}>
          <h2>目標額の設定</h2>
          <button 
            className="secondary-button" 
            type="button" 
            onClick={onBack}
          >
            ← 戻る
          </button>
        </div>

        <table className="app-table">
          <thead>
            <tr>
              <th>カテゴリ</th>
              <th>目標額</th>
            </tr>
          </thead>
          <tbody>
            {mergedRows.map((row) => {
              const key = row.categoryId || row.categoryDisplay;
              return (
                <tr key={key}>
                  <td>
                    <strong>{row.categoryIcon} {row.categoryDisplay}</strong>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        {/* display a currency icon at the left side of the input */}
                        <span style={{ 
                          position: "absolute", 
                          left: 12, 
                          top: "50%", 
                          transform: "translateY(-50%)",
                          color: "#8fa8c8",
                          fontWeight: "bold"
                        }}>
                          {getCurrencyIcon(selectedCurrency)}
                        </span>
                        <input
                          type="number"
                          className="category-target-input"
                          value={targets[key] === undefined ? "" : targets[key]}
                          onChange={(e) => handleTargetChange(key, e.target.value)}
                          placeholder="0"
                          style={{ 
                            flex: 1, 
                            paddingLeft: 30
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button 
            className="secondary-button" 
            type="button" 
            onClick={onBack}
          >
            キャンセル
          </button>
          <button 
            className="secondary-button" 
            type="button" 
            onClick={async () => {
              await handleSaveTargets();
              onBack();
            }}
            disabled={saving}
          >
            保存
          </button>
        </div>
        {saveMessage && (
          <span style={{ marginTop: 12, color: "#8fa8c8", display: "block", textAlign: "center" }}>
            {saveMessage}
          </span>
        )}
      </section>
    </>
  );
}