import { useId, useRef, useState } from 'react';

type ImageUploadProps = {
  label: string;
  value?: string | null;
  onChange: (value: string | null) => void;
};

export function ImageUpload({ label, value, onChange }: ImageUploadProps) {
  const inputId = useId(), input=useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  return (
    <div className="image-upload space-y-3">
      <label htmlFor={inputId} className="block text-[10px] voice text-muted">{label}</label>
      {value && <img src={value} alt={`${label} preview`} className="h-24 w-24 rounded-xl object-cover border border-border" />}
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setError('');
          if (!file) return;
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 650_000) {
            setError('Choose a PNG, JPEG or WebP smaller than 650 KB.');
            event.target.value = '';
            return;
          }
          const reader = new FileReader();
          reader.onload = () => { if (typeof reader.result === 'string') onChange(reader.result); };
          reader.onerror = () => setError('This image could not be read.');
          reader.readAsDataURL(file);
        }}
      />
      <button type="button" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm hover:border-accent" onClick={()=>input.current?.click()}>{value?'Change image':'Upload image'}</button>
      <p className="text-xs text-muted">JPG, PNG or WebP · up to 650 KB</p>
      {value && <button type="button" onClick={() => onChange(null)} className="text-xs text-muted hover:text-ink">remove image</button>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
