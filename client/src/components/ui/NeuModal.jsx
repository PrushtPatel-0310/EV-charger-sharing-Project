const NeuModal = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <div className="neu-modal soft-enter relative w-full max-w-lg">
        <button
          type="button"
          onClick={onClose}
          className="btn absolute right-4 top-4 h-9 w-9 rounded-full p-0 text-base"
          aria-label="Close modal"
        >
          x
        </button>
        {title ? <h3 className="mb-4 pr-12 text-xl font-bold text-primary-900">{title}</h3> : null}
        {children}
      </div>
    </div>
  );
};

export default NeuModal;
