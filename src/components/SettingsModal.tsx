import React, { useState, useRef } from 'react';
import { X, Camera, Check } from 'lucide-react';

export interface UserProfileData {
  name: string;
  username?: string;
  avatar?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { name: string; email: string; username?: string; avatar?: string } | null;
  onSave: (data: UserProfileData) => void;
}

export function SettingsModal({ isOpen, onClose, currentUser, onSave }: SettingsModalProps) {
  if (!isOpen || !currentUser) return null;

  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 256; // Resize to 256x256 max
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG with 0.8 quality to massively reduce base64 size
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setAvatar(compressedDataUrl);
          } else {
            setAvatar(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({ name, username, avatar });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/40">
          <h2 className="text-lg font-bold text-white">Pengaturan Profil</h2>
          <button onClick={onClose} className="p-1 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover group-hover:opacity-75 transition-opacity" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center text-3xl font-bold text-white group-hover:opacity-75 transition-opacity">
                  {name ? name.slice(0, 2).toUpperCase() : 'U'}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-xs text-white/50">Klik untuk mengganti foto</p>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-black/40 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black/40 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                placeholder="Masukkan username (@contoh)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/20 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-white/70 hover:bg-white/10 transition-colors cursor-pointer">
            Batal
          </button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl font-medium text-black bg-white hover:bg-gray-200 transition-colors flex items-center gap-2 cursor-pointer">
            <Check className="w-4 h-4" />
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
