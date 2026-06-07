interface Props {
  onClick: () => void;
}

export default function BackButton({ onClick }: Props) {
  return (
    <button className="back-btn panel" onClick={onClick}>
      <span>←</span> Back to globe
    </button>
  );
}
