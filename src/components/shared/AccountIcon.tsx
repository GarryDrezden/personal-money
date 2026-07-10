import type { LucideProps } from 'lucide-react';

import { colorHex, resolveIconComponent } from '../../utils/icons';

import { CozyIconFrame } from './CozyIconFrame';



interface AccountIconProps extends Omit<LucideProps, 'ref' | 'color'> {

  icon?: string | null;

  accountColor?: string | null;

}



export function AccountIcon({

  icon,

  accountColor,

  size = 18,

  className = '',

  ...props

}: AccountIconProps) {

  const Icon = resolveIconComponent(icon);

  const tint = colorHex(accountColor);

  const box = Number(size) + 10;



  return (

    <CozyIconFrame box={box} tint={tint} className={className}>

      <Icon size={size} aria-hidden {...props} />

    </CozyIconFrame>

  );

}

