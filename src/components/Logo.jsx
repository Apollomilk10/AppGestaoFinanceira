/**
 * Marca do app. Usa a imagem em public/ para não inflar o bundle —
 * o navegador cacheia junto com os ícones do PWA.
 */
export default function Logo({ size = 32, className = '' }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="Finanças & Orçamento"
      width={size}
      height={size}
      className={`logo ${className}`}
      draggable="false"
    />
  );
}
