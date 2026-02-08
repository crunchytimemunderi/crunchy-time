// Placeholder for reusable UI components
// Example: Button, Card, Modal, etc.

export function Button({ children, onClick, variant = 'primary', ...props }: any) {
  const baseStyles = 'px-4 py-2 rounded-md font-medium transition';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant as keyof typeof variants]}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      {title && <h3 className="text-xl font-bold mb-4">{title}</h3>}
      {children}
    </div>
  );
}
