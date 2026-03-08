import { Link } from 'react-router-dom';

const NeuNavbar = ({ title, children, titleHref = '/' }) => {
  return (
    <header className="sticky top-3 z-30 px-4">
      <nav className="container mx-auto neu-navbar px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={titleHref} className="text-2xl font-extrabold tracking-tight text-primary-700">
            {title}
          </Link>
          <div className="flex flex-wrap items-center gap-3">{children}</div>
        </div>
      </nav>
    </header>
  );
};

export default NeuNavbar;
