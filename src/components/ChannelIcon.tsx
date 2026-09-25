import { Mail, Linkedin, Globe } from 'lucide-react';
import type { Channel } from '@/types';

export const CHANNELS: { value: Channel; label: string; icon: typeof Mail }[] = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'portal', label: 'Portal', icon: Globe },
];

export default function ChannelIcon({ channel, className = 'w-3.5 h-3.5' }: { channel?: Channel | null; className?: string }) {
  const Icon = CHANNELS.find((c) => c.value === (channel ?? 'email'))?.icon ?? Mail;
  return <Icon className={className} />;
}
