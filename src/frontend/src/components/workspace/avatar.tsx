export interface AvatarProps {
  initials: string;
  name: string;
  size?: 'sm' | 'lg';
  className?: string;
}

export function Avatar({ initials, name, size = 'sm', className = '' }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-body-sm font-medium text-primary ${size === 'lg' ? 'h-14 w-14' : 'h-10 w-10'} ${className}`}
    >
      {initials}
    </span>
  );
}
