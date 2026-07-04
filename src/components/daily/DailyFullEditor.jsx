import React from 'react';
import {
  formatBaseAmountForInput,
  formatNumericInput,
  sanitizeNumericInput
} from '../../lib/currency.js';
import { logError } from '../../lib/logger.js';

// Full-page editor for a single daily row.
// Props:
// - initial: object with fields { id, type, categoryId, title, amount, entryDate, note }
// - categoryOptions: array of { id, label, icon }
// - onSave: async function(data) => Promise
// - onCancel: function()
// - t: translations object
export default function DailyFullEditor({ initial = {}, categoryOptions = [], onSave, onCancel, t = {} }) {
  const [form, setForm] = React.useState({
    id: initial.id || null,
    type: initial.type || 'fee',
    categoryId: initial.categoryId || (categoryOptions[0]?.id || ''),
    title: initial.title || '',
    amount: initial.amount || '',
    entryDate: initial.entryDate || '',
    note: initial.note || ''
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    // if mounting in a standalone window and opener has category data, prefer that
    try {
      if (!categoryOptions || categoryOptions.length === 0) {
        const openerCats = (window && window.opener && window.opener.__DAILY_CATS__) || null;
        if (openerCats && openerCats.length) {
          // do nothing here; consumer can pass categoryOptions. This is just a graceful fallback.
        }
      }
    } catch (e) {
      // ignore
    }
  }, [categoryOptions]);

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
        entryDate: form.entryDate,
        note: form.note
      };

      if (onSave) {
        await onSave(payload);
      } else if (window && window.opener) {
        // post back to opener and close
        try {
          window.opener.postMessage({ type: 'daily-edit-saved', id: form.id, data: payload }, '*');
        } catch (e) {
          logError('DailyFullEditor.postMessage', e);
        }
        window.close();
      }
    } catch (err) {
      logError('DailyFullEditor.save', err);
      setError(err.message || t.errorDailyFailed || '保存に失敗しました');
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
      <h1 style={{ marginTop: 6 }}>{t.editDailyButton || 'Edit'}</h1>
      {error && <p className="error">{error}</p>}
      <label>
        {t.dateLabel}
        <input type="date" value={form.entryDate} onChange={(e) => setField('entryDate', e.target.value)} />
      </label>

      <label>
        {t.typeLabel}
        <select value={form.type} onChange={(e) => setField('type', e.target.value)}>
          <option value="fee">{t.typeFee}</option>
          <option value="income">{t.typeIncome}</option>
        </select>
      </label>

      <label>
        {t.categoryLabel}
        <select value={form.categoryId} onChange={(e) => setField('categoryId', e.target.value)} disabled={form.type !== 'fee'}>
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
        {t.amountLabel}
        <input type="text" inputMode="decimal" value={formatNumericInput(form.amount)} onChange={(e) => setField('amount', sanitizeNumericInput(e.target.value))} />
      </label>

      <label>
        {t.noteLabel}
        <input type="text" value={form.note} onChange={(e) => setField('note', e.target.value)} />
      </label>

      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={save} disabled={saving} style={{ marginRight: 8 }}>{t.updateDailyButton || '保存'}</button>
        <button type="button" onClick={cancel} disabled={saving}>{t.cancelEditButton || 'キャンセル'}</button>
      </div>
    </div>
  );
}
