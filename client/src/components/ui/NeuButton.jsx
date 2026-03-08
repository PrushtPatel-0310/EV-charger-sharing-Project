const NeuButton = ({
  as: Component = 'button',
  variant = 'primary',
  className = '',
  children,
  ...props
}) => {
  const variantClass =
    variant === 'outline'
      ? 'btn btn-outline'
      : variant === 'secondary'
        ? 'btn btn-secondary'
        : 'btn btn-primary';

  return (
    <Component className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
};

export default NeuButton;
