const NeuWidget = ({ className = '', children, ...props }) => (
  <div className={`neu-widget ${className}`.trim()} {...props}>
    {children}
  </div>
);

export default NeuWidget;
