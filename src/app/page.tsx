import { Hero } from '@/components/sections/Hero/Hero';
import { Summary } from '@/components/sections/Summary/Summary';
import { About } from '@/components/sections/About/About';
import { Experience } from '@/components/sections/Experience/Experience';
import { Skills } from '@/components/sections/Skills/Skills';
import { Contact } from '@/components/sections/Contact/Contact';
import { BackToTop } from '@/components/ui/BackToTop/BackToTop';
import { ChatBot } from '@/components/ui/ChatBot/ChatBot';

export default function Home() {
  return (
    <main>
      <Hero />
      <Summary />
      <Experience />
      <About />
      <Skills />
      <Contact />
      <BackToTop />
      <ChatBot />
    </main>
  );
}
