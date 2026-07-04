import React from 'react';
import {
  sanitizeNumericInput,
  formatNumericInput
} from '../../lib/currency.js';
import { logError } from '../../lib/logger.js';

// Full-page editor for a recurring (monthly) row.
// Props:
// - initial: { id, type, categoryId, title, amount, startMonth, endMonth, frequency }
// - categoryOptions: array of { id, label, icon }
// - onSave: async function(data)
// - onCancel: function()
// - t: translations
export default function MonthlyFullEditor({ initial = {}, categoryOptions = [], onSave, onCancel, t = {} }) {
  const [form, setForm] = React.useState({
    id: initial.id || null,
    type: initial.type || 'fee',
    categoryId: initial.categoryId || (categoryOptions[0]?.id || ''),
    title: initial.title || '',
    amount: initial.amount || '',
    note: initial.note || '',
    startMonth: initial.startMonth || '',
    endMonth: initial.endMonth || '',
    frequency: initial.frequency || 'monthly'
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function save() {
    setError('');
    setSaving(true);
    try {
      const payload = {
        id: form.id,
        type: form.type,
        categoryId: form.type === 'fee' ? form.categoryId : null,
        title: form.title,
        amount: sanitizeNumericInput(form.amount),
        note: form.note || '',
        startMonth: form.startMonth,
        endMonth: form.endMonth || null,
        frequency: form.frequency,
      };

      if (onSave) {
        await onSave(payload);
      } else if (window && window.opener) {
        try {
          window.opener.postMessage({ type: 'monthly-edit-saved', id: form.id, data: payload }, '*');
        } catch (e) {
          logError('MonthlyFullEditor.postMessage', e);
        }
        window.close();
      }
    } catch (err) {
      logError('MonthlyFullEditor.save', err);
      setError(err.message || t.errorRecurringFailed || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    if (onCancel) onCancel();
    else if (window && window.close) window.close();
  }

  return (
    <div style={{ padding: 20, maxWidth: 880, margin: '0 auto', color: 'var(--ink)' }}>
      <h1 style={{ marginTop: 6 }}>{t.editRecurringButton || 'Edit'}</h1>
      {error && <p className="error">{error}</p>}

      <label>
        {t.recurringStartMonthLabel}
        <input type="month" value={form.startMonth} onChange={(e) => setField('startMonth', e.target.value)} />
      </label>

      <label>
        {t.recurringEndMonthLabel}
        <input type="month" value={form.endMonth || ''} onChange={(e) => setField('endMonth', e.target.value)} />
      </label>

      <label>
        {t.typeLabel}
        <select value={form.type} onChange={(e) => setField('type', e.target.value)}>
          <option value="fee">{t.typeFee}</option>
          <option value="income">{t.typeIncome}</option>
        </select>
      </label>

      <label>
        {t.frequencyLabel}
        <select value={form.frequency} onChange={(e) => setField('frequency', e.target.value)}>
          <option value="monthly">{t.frequencyMonthly || '月次'}</option>
          <option value="annual">{t.frequencyAnnual || '年次'}</option>
        </select>
      </label>

      <label>
        {t.categoryLabel}
        <select value={form.categoryId || ''} onChange={(e) => setField('categoryId', e.target.value)} disabled={form.type !== 'fee'}>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>{(c.icon ? c.icon + ' ' : '') + c.label}</option>
          ))}
        </select>
      </label>

      <label>
        {t.titleLabel}
        <input type="text" value={form.title} onChange={(e) => setField('title', e.target.value)} />
      </label>

      <label>
        {t.noteLabel}
        <input type="text" value={form.note || ''} onChange={(e) => setField('note', e.target.value)} />
      </label>

      <label>
        {t.amountLabel}
        <input type="text" inputMode="decimal" value={formatNumericInput(form.amount)} onChange={(e) => setField('amount', sanitizeNumericInput(e.target.value))} />
      </label>

      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={save} disabled={saving} style={{ marginRight: 8 }}>{t.updateRecurringButton || '保存'}</button>
        <button type="button" onClick={cancel} disabled={saving}>{t.cancelEditButton || 'キャンセル'}</button>
      </div>
    </div>
  );
}
