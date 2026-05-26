import { Hero } from '@/components/sections/Hero';
import { Summary } from '@/components/sections/Summary';
import { About } from '@/components/sections/About';
import { Experience } from '@/components/sections/Experience';
import { Skills } from '@/components/sections/Skills';
import { Contact } from '@/components/sections/Contact';
import { BackToTop } from '@/components/ui/BackToTop';
import { ChatBot } from '@/components/ui/ChatBot';

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
