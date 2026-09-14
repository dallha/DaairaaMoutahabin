import React, { useState, useEffect } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero';

interface MemberAvatarProps {
  photoUrl?: string | null;
  name?: string;
  matricule?: string;
  size?: AvatarSize;
  className?: string;
  borderGold?: boolean;
  onClick?: () => void;
}

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string; icon: string }> = {
  sm: { container: 'w-8 h-8', text: 'text-[11px]', icon: 'text-[15px]' },
  md: { container: 'w-12 h-12', text: 'text-sm', icon: 'text-[20px]' },
  lg: { container: 'w-16 h-16', text: 'text-base', icon: 'text-[26px]' },
  xl: { container: 'w-20 h-20', text: 'text-xl', icon: 'text-[32px]' },
  hero: { container: 'w-28 h-28 sm:w-32 sm:h-32', text: 'text-2xl sm:text-3xl', icon: 'text-[44px]' },
};

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  photoUrl,
  name = '',
  matricule = '',
  size = 'md',
  className = '',
  borderGold = true,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  // Réinitialise l'erreur si l'URL change (ex: suite à un nouvel upload)
  useEffect(() => {
    setImageError(false);
  }, [photoUrl]);

  const sizeConf = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  // Calcul élégant des initiales
  const getInitials = (): string => {
    const cleaned = name.trim();
    if (cleaned) {
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return cleaned.slice(0, 2).toUpperCase();
    }
    if (matricule) {
      const numPart = matricule.replace(/[^0-9]/g, '');
      return numPart ? numPart.slice(-2) : 'DM';
    }
    return 'D';
  };

  const borderClasses = borderGold
    ? 'border border-[#f2ca50]/40 shadow-[0_0_12px_rgba(242,202,80,0.15)]'
    : 'border border-[#2b3547]';

  const hasValidPhoto = Boolean(photoUrl && photoUrl.trim() && !imageError);

  return (
    <div
      onClick={onClick}
      className={`relative rounded-full shrink-0 flex items-center justify-center overflow-hidden select-none ${sizeConf.container} ${borderClasses} bg-[#111722] text-[#f2ca50] ${className} ${
        onClick ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : ''
      }`}
      title={name || matricule || 'Membre de la Dahirah'}
    >
      {hasValidPhoto ? (
        <img
          src={photoUrl!}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <span className={`font-bold font-mono tracking-wider text-[#f2ca50] ${sizeConf.text}`}>
          {getInitials()}
        </span>
      )}
    </div>
  );
};
