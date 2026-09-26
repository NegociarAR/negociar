// Marca NEGOCIAR — assets oficiais.
// LogoN: o "N" isolado (ícone). LogoFull: logo + texto (login/rodapé).
import Image from "next/image";

export function LogoN({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/brand/n.png"
      alt="NEGOCIAR"
      width={size}
      height={size}
      priority
      style={{ objectFit: "contain" }}
    />
  );
}

export function LogoFull({ height = 32 }: { height?: number }) {
  // proporção do asset: 291 x 69
  const width = Math.round((height * 291) / 69);
  return (
    <Image
      src="/brand/logo.png"
      alt="NEGOCIAR"
      width={width}
      height={height}
      priority
      style={{ objectFit: "contain" }}
    />
  );
}
