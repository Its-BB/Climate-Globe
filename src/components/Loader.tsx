interface Props {
  message: string;
}

export default function Loader({ message }: Props) {
  return (
    <div className="loader panel">
      <span className="spinner" />
      {message}
    </div>
  );
}
