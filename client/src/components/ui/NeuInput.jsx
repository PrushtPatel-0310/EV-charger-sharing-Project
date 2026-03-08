const NeuInput = ({ className = '', ...props }) => (
  <input className={`input focus-glow ${className}`.trim()} {...props} />
);

export default NeuInput;
