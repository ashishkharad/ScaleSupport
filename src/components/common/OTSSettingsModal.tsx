import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Percent,
  Building,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Lock,
  Edit2,
  Save,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import {
  OTSSchemeConfig,
  BankOTSRule,
  OTSSlabRule,
  DEFAULT_OTS_CONFIG,
  getOTSSchemeConfig,
  saveOTSSchemeConfig,
  formatDateDMY,
} from '../../utils/otsScheme';

interface OTSSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OTSSettingsModal: React.FC<OTSSettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, banks } = useSRMS();
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'bank_dates' | 'slabs'>('bank_dates');
  const [config, setConfig] = useState<OTSSchemeConfig>(() => getOTSSchemeConfig());
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Bank Form State
  const [selectedBankName, setSelectedBankName] = useState<string>('');
  const [bankLastDate, setBankLastDate] = useState<string>('2026-09-30');
  const [bankValidTillText, setBankValidTillText] = useState<string>('30 September 2026');
  const [bankNotes, setBankNotes] = useState<string>('');

  // Slab Form State
  const [editingSlabId, setEditingSlabId] = useState<string | null>(null);
  const [slabName, setSlabName] = useState<string>('');
  const [slabType, setSlabType] = useState<'lte_date' | 'between_dates' | 'gte_date'>('between_dates');
  const [slabDate1, setSlabDate1] = useState<string>('2021-04-01');
  const [slabDate2, setSlabDate2] = useState<string>('2023-03-31');
  const [slabCustomerPay, setSlabCustomerPay] = useState<number>(60);
  const [slabDescription, setSlabDescription] = useState<string>('');

  // Reload config when modal opens
  useEffect(() => {
    if (isOpen) {
      const current = getOTSSchemeConfig();
      setConfig(current);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  // Helper to auto-format text when date changes
  const handleDateChange = (isoDate: string) => {
    setBankLastDate(isoDate);
    try {
      const d = new Date(isoDate);
      if (!isNaN(d.getTime())) {
        const months = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        setBankValidTillText(`${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`);
      }
    } catch {}
  };

  const handleAddOrUpdateBankRule = () => {
    if (!isAdmin) return;
    const bName = selectedBankName.trim();
    if (!bName) return;

    const newRules = { ...config.bankRules };
    newRules[bName] = {
      bankName: bName,
      lastDateIso: bankLastDate,
      validTillText: bankValidTillText.trim() || bankLastDate,
      notes: bankNotes.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name || 'Admin',
    };

    const updatedConfig: OTSSchemeConfig = {
      ...config,
      bankRules: newRules,
    };

    setConfig(updatedConfig);
    saveOTSSchemeConfig(updatedConfig, currentUser.name);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);

    // Reset inputs
    setSelectedBankName('');
    setBankNotes('');
  };

  const handleDeleteBankRule = (bankKey: string) => {
    if (!isAdmin) return;
    const newRules = { ...config.bankRules };
    delete newRules[bankKey];

    const updatedConfig: OTSSchemeConfig = {
      ...config,
      bankRules: newRules,
    };
    setConfig(updatedConfig);
    saveOTSSchemeConfig(updatedConfig, currentUser.name);
  };

  const handleSaveDefaultDeadline = (defaultIso: string, defaultText: string) => {
    if (!isAdmin) return;
    const updatedConfig: OTSSchemeConfig = {
      ...config,
      defaultLastDateIso: defaultIso,
      defaultValidTill: defaultText,
    };
    setConfig(updatedConfig);
    saveOTSSchemeConfig(updatedConfig, currentUser.name);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveSlab = () => {
    if (!isAdmin) return;
    const name = slabName.trim();
    if (!name) return;

    const discount = Math.max(0, 100 - slabCustomerPay);
    let updatedSlabs: OTSSlabRule[] = [];

    if (editingSlabId) {
      updatedSlabs = config.slabs.map((s) => {
        if (s.id === editingSlabId) {
          return {
            ...s,
            name,
            type: slabType,
            date1: slabDate1,
            date2: slabType === 'between_dates' ? slabDate2 : undefined,
            customerPayPercentage: slabCustomerPay,
            discountPercentage: discount,
            description: slabDescription.trim() || `Customer Pays ${slabCustomerPay}%, Discount ${discount}%`,
          };
        }
        return s;
      });
    } else {
      const newSlab: OTSSlabRule = {
        id: `slab-${Date.now()}`,
        name,
        type: slabType,
        date1: slabDate1,
        date2: slabType === 'between_dates' ? slabDate2 : undefined,
        customerPayPercentage: slabCustomerPay,
        discountPercentage: discount,
        description: slabDescription.trim() || `Customer Pays ${slabCustomerPay}%, Discount ${discount}%`,
      };
      updatedSlabs = [...config.slabs, newSlab];
    }

    const updatedConfig: OTSSchemeConfig = {
      ...config,
      slabs: updatedSlabs,
    };
    setConfig(updatedConfig);
    saveOTSSchemeConfig(updatedConfig, currentUser.name);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);

    // Reset slab form
    setEditingSlabId(null);
    setSlabName('');
    setSlabDescription('');
  };

  const handleDeleteSlab = (id: string) => {
    if (!isAdmin) return;
    const updatedSlabs = config.slabs.filter((s) => s.id !== id);
    const updatedConfig: OTSSchemeConfig = {
      ...config,
      slabs: updatedSlabs,
    };
    setConfig(updatedConfig);
    saveOTSSchemeConfig(updatedConfig, currentUser.name);
  };

  const handleResetToDefaultSlabs = () => {
    if (!isAdmin) return;
    if (!window.confirm('Reset OTS slabs to standard banking scheme rules?')) return;
    const updatedConfig: OTSSchemeConfig = {
      ...config,
      slabs: DEFAULT_OTS_CONFIG.slabs,
    };
    setConfig(updatedConfig);
    saveOTSSchemeConfig(updatedConfig, currentUser.name);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const allAvailableBankNames = useMemo(() => {
    const list = new Set<string>();
    banks.forEach((b) => list.add(b.name));
    Object.keys(config.bankRules).forEach((b) => list.add(b));
    return Array.from(list).sort();
  }, [banks, config.bankRules]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-200">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">OTS Scheme &amp; Bank Deadline Controls</h3>
                {isAdmin ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Admin Authorized
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-300 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Read Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Bank-wise OTS settlement deadlines and NPA date slab discount calculation engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Policy Notice */}
        {!isAdmin && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-900 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Restricted Configuration:</span> OTS last date (bank-wise) and OTS scheme slab calculation parameters can strictly be modified by the System Administrator. Viewing in read-only mode.
            </div>
          </div>
        )}

        {savedSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Settings saved successfully. All bank calculations and WhatsApp templates have updated in real time.</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('bank_dates')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'bank_dates'
                ? 'text-amber-700 border-amber-600 bg-amber-50/50'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Bank-Wise OTS Last Dates</span>
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
              {Object.keys(config.bankRules).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('slabs')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'slabs'
                ? 'text-amber-700 border-amber-600 bg-amber-50/50'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>OTS Slabs &amp; Discount Rules</span>
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
              {config.slabs.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: BANK-WISE OTS LAST DATES */}
          {activeTab === 'bank_dates' && (
            <div className="space-y-6">
              {/* Default Universal Deadline */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-600" /> Universal Default OTS Last Date
                  </span>
                  <p className="text-xs text-slate-500">
                    Applied automatically to any bank that does not have a custom deadline override.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    disabled={!isAdmin}
                    value={config.defaultLastDateIso}
                    onChange={(e) => {
                      const iso = e.target.value;
                      const d = new Date(iso);
                      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      const txt = !isNaN(d.getTime()) ? `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}` : iso;
                      handleSaveDefaultDeadline(iso, txt);
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-60 focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200">
                    {config.defaultValidTill}
                  </span>
                </div>
              </div>

              {/* Add / Override Bank-wise Date Form (Admin Only) */}
              {isAdmin && (
                <div className="p-4 bg-amber-50/40 border border-amber-200/80 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-amber-700" />
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Configure Bank-Specific Settlement Deadline
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Bank Name:
                      </label>
                      <input
                        type="text"
                        list="available-banks-datalist"
                        value={selectedBankName}
                        onChange={(e) => setSelectedBankName(e.target.value)}
                        placeholder="e.g. Bank of Maharashtra, SBI"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                      />
                      <datalist id="available-banks-datalist">
                        {allAvailableBankNames.map((bnk) => (
                          <option key={bnk} value={bnk} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Last Settlement Date:
                      </label>
                      <input
                        type="date"
                        value={bankLastDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Formatted Text (in WhatsApp &amp; Letter):
                      </label>
                      <input
                        type="text"
                        value={bankValidTillText}
                        onChange={(e) => setBankValidTillText(e.target.value)}
                        placeholder="e.g. 30 September 2026"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <input
                      type="text"
                      value={bankNotes}
                      onChange={(e) => setBankNotes(e.target.value)}
                      placeholder="Optional circular reference or internal remarks..."
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={handleAddOrUpdateBankRule}
                      disabled={!selectedBankName.trim()}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Set Bank Deadline</span>
                    </button>
                  </div>
                </div>
              )}

              {/* List of Active Bank Deadlines */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Active Bank-Wise Settlement Deadlines</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({Object.keys(config.bankRules).length} configured)
                  </span>
                </h4>

                {Object.keys(config.bankRules).length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                    No custom bank deadlines configured. All banks currently follow the universal default: <strong>{config.defaultValidTill}</strong>.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                        <tr>
                          <th className="p-3">Bank Name</th>
                          <th className="p-3">OTS Last Date</th>
                          <th className="p-3">WhatsApp / Notice Display Text</th>
                          <th className="p-3">Remarks</th>
                          {isAdmin && <th className="p-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {(Object.values(config.bankRules) as BankOTSRule[]).map((rule) => (
                          <tr key={rule.bankName} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                              <Building className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{rule.bankName}</span>
                            </td>
                            <td className="p-3 font-mono text-slate-700 font-semibold">
                              {rule.lastDateIso}
                            </td>
                            <td className="p-3">
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-900 font-bold rounded-md border border-amber-200 text-[11px]">
                                {rule.validTillText}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 text-[11px]">
                              {rule.notes || '-'}
                            </td>
                            {isAdmin && (
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDeleteBankRule(rule.bankName)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Delete rule and revert to default deadline"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: OTS SLABS & DISCOUNT RULES */}
          {activeTab === 'slabs' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-blue-900 text-xs">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Slabs evaluate customer eligibility based on NPA date. Changes immediately affect calculated OTS amounts and discount percentages.
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={handleResetToDefaultSlabs}
                    className="px-3 py-1 bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Standard Slabs</span>
                  </button>
                )}
              </div>

              {/* Add / Edit Slab Form (Admin Only) */}
              {isAdmin && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-600" />
                      <span>{editingSlabId ? 'Edit OTS Calculation Slab' : 'Add New OTS Calculation Slab'}</span>
                    </h4>
                    {editingSlabId && (
                      <button
                        onClick={() => {
                          setEditingSlabId(null);
                          setSlabName('');
                          setSlabDescription('');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        Cancel Editing
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="lg:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Slab Label / Name:
                      </label>
                      <input
                        type="text"
                        value={slabName}
                        onChange={(e) => setSlabName(e.target.value)}
                        placeholder="e.g. NPA ≤ 31-03-2019"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        NPA Date Condition:
                      </label>
                      <select
                        value={slabType}
                        onChange={(e) => setSlabType(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="lte_date">On or Before (≤ Date)</option>
                        <option value="between_dates">Between Dates (Range)</option>
                        <option value="gte_date">On or After (≥ Date)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Customer Pays (%):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={slabCustomerPay}
                          onChange={(e) => setSlabCustomerPay(Number(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-amber-700 focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 whitespace-nowrap">
                          {Math.max(0, 100 - slabCustomerPay)}% Disc.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        {slabType === 'lte_date' ? 'Cutoff Date (≤):' : slabType === 'gte_date' ? 'Start Date (≥):' : 'Date 1 (From):'}
                      </label>
                      <input
                        type="date"
                        value={slabDate1}
                        onChange={(e) => setSlabDate1(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {slabType === 'between_dates' && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Date 2 (To):
                        </label>
                        <input
                          type="date"
                          value={slabDate2}
                          onChange={(e) => setSlabDate2(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={handleSaveSlab}
                      disabled={!slabName.trim()}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingSlabId ? 'Update Slab' : 'Save Slab Rule'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Slabs Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <tr>
                      <th className="p-3">Slab Name</th>
                      <th className="p-3">NPA Date Condition</th>
                      <th className="p-3">Customer Pays</th>
                      <th className="p-3">Discount Offered</th>
                      <th className="p-3">Summary</th>
                      {isAdmin && <th className="p-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {config.slabs.map((slab) => (
                      <tr key={slab.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-bold text-slate-900">
                          {slab.name}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {slab.type === 'lte_date' && `NPA ≤ ${slab.date1}`}
                          {slab.type === 'between_dates' && `${slab.date1} to ${slab.date2}`}
                          {slab.type === 'gte_date' && `NPA ≥ ${slab.date1}`}
                        </td>
                        <td className="p-3 font-bold text-amber-700">
                          {slab.customerPayPercentage}%
                        </td>
                        <td className="p-3 font-bold text-emerald-700">
                          {slab.discountPercentage}%
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {slab.description || `Pays ${slab.customerPayPercentage}%, ${slab.discountPercentage}% off`}
                        </td>
                        {isAdmin && (
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => {
                                setEditingSlabId(slab.id);
                                setSlabName(slab.name);
                                setSlabType(slab.type);
                                setSlabDate1(slab.date1);
                                setSlabDate2(slab.date2 || '');
                                setSlabCustomerPay(slab.customerPayPercentage);
                                setSlabDescription(slab.description || '');
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Edit slab"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlab(slab.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete slab"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Configuration saved locally &amp; synced across recovery engine instances.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
