type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header style={{ marginBottom: 24 }}>
      <h1 style={{ marginBottom: 8 }}>{title}</h1>
      <p style={{ margin: 0, color: "#6e6457" }}>{description}</p>
    </header>
  );
}
