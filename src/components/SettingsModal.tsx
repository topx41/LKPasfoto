import React, { useState } from 'react';
import { Settings, X, Save, FileCode, SlidersHorizontal, Eye } from 'lucide-react';
import { StudioSettings } from '../types';
import { generateFileName } from '../utils/filenameUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudioSettings;
  onSaveSettings: (newSettings: StudioSettings) => void;
  sampleCustomerName: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  sampleCustomerName,
}) => {
  const [formData, setFormData] = useState<StudioSettings>({ ...settings });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  const previewName = generateFileName(formData, sampleCustomerName || 'Budi_Santoso');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Pengaturan File & Studio</h3>
              <p className="text-xs text-slate-400">Atur prefix dinamis & format nama foto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="settings-form" onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Live Preview Box */}
          <div className="p-3.5 bg-sky-950/40 border border-sky-500/30 rounded-xl space-y-1">
            <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Preview Format File
            </div>
            <p className="text-sm font-mono font-bold text-slate-100 break-all">{previewName}</p>
          </div>

          {/* Dynamic Prefix */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-semibold">
              Prefix Nama File Dinamis
            </label>
            <input
              type="text"
              required
              value={formData.prefix}
              onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
              placeholder="Contoh: STUDIO_, PAS_, WEDDING_"
              className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 text-slate-100 font-mono rounded-xl focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400">
              Awalan file yang akan otomatis disertakan sebelum atau sesudah nomor file.
            </p>
          </div>

          {/* Number digit & current counter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">
                Nomor Saat Ini
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.currentNumber}
                onChange={(e) =>
                  setFormData({ ...formData, currentNumber: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 text-slate-100 font-mono rounded-xl focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">
                Jumlah Digit Nomor
              </label>
              <select
                value={formData.numberDigitCount}
                onChange={(e) =>
                  setFormData({ ...formData, numberDigitCount: parseInt(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 text-slate-100 font-mono rounded-xl focus:outline-none focus:border-sky-500"
              >
                <option value={2}>2 Digit (01, 02...)</option>
                <option value={3}>3 Digit (001, 002...)</option>
                <option value={4}>4 Digit (0001, 0002...)</option>
                <option value={5}>5 Digit (00001...)</option>
              </select>
            </div>
          </div>

          {/* File Name Format Pattern */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-semibold">
              Format Kombinasi Nama File
            </label>
            <div className="space-y-2">
              {[
                {
                  id: 'PREFIX_NUM_NAME',
                  label: '{PREFIX}{NOMOR}_{NAMA}.jpg',
                  desc: 'STUDIO_001_Budi.jpg',
                },
                {
                  id: 'PREFIX_NUM',
                  label: '{PREFIX}{NOMOR}.jpg',
                  desc: 'STUDIO_001.jpg',
                },
                {
                  id: 'NAME_PREFIX_NUM',
                  label: '{NAMA}_{PREFIX}{NOMOR}.jpg',
                  desc: 'Budi_STUDIO_001.jpg',
                },
              ].map((pattern) => (
                <label
                  key={pattern.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    formData.fileNameFormat === pattern.id
                      ? 'bg-sky-500/10 border-sky-500/50 text-slate-100'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="fileNameFormat"
                      checked={formData.fileNameFormat === pattern.id}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          fileNameFormat: pattern.id as StudioSettings['fileNameFormat'],
                        })
                      }
                      className="text-sky-500 focus:ring-sky-500"
                    />
                    <span className="font-mono font-medium text-xs">{pattern.label}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{pattern.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Auto advance customer option */}
          <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-200 font-medium">
              <input
                type="checkbox"
                checked={formData.autoAdvanceOnCapture}
                onChange={(e) => setFormData({ ...formData, autoAdvanceOnCapture: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500"
              />
              <span>Otomatis pindah ke customer berikutnya setelah 1x capture</span>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl"
          >
            Batal
          </button>
          <button
            type="submit"
            form="settings-form"
            className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
