const NeuCard = ({ className = '', children, hover = true, ...props }) => {
  const baseClass = hover ? 'card' : 'rounded-2xl bg-primary-100 p-6 shadow-neu';

  return (
    <div className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

export default NeuCard;
