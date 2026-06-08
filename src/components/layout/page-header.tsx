type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="page-header-block">
      <h1 className="page-header-title">{title}</h1>
      <p className="page-header-description">{description}</p>
    </header>
  );
}
