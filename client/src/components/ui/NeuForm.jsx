const NeuForm = ({ className = '', children, ...props }) => (
  <form className={`neu-form ${className}`.trim()} {...props}>
    {children}
  </form>
);

export default NeuForm;
