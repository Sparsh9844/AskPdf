import clsx from 'clsx';

const variants = {
  primary:  'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-950 shadow-sm',
  secondary:'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 shadow-sm',
  ghost:    'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  danger:   'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
};

const sizes = {
  sm:  'h-7 px-3 text-xs gap-1.5',
  md:  'h-9 px-4 text-sm gap-2',
  lg:  'h-10 px-5 text-sm gap-2',
};

/**
 * Button — reusable button with variants and sizes
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  disabled,
  loading,
  ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon && (
        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
      )}
      {children}
      {IconRight && !loading && (
        <IconRight className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
      )}
    </button>
  );
}
