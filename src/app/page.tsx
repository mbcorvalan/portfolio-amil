import { Hero } from '@/components/sections/Hero/Hero';
import { Summary } from '@/components/sections/Summary/Summary';
import { Experience } from '@/components/sections/Experience/Experience';
import { Skills } from '@/components/sections/Skills/Skills';
import { Contact } from '@/components/sections/Contact/Contact';
import { BackToTop } from '@/components/ui/BackToTop/BackToTop';
import { ChatBot } from '@/components/ui/ChatBot/ChatBot';
import styles from '@/components/sections/Hero/Hero.module.scss';

export default function Home() {
  return (
    <main>
      <div className={styles.heroGroup}>
        <Hero />
        <Summary />
      </div>
      <Experience />
      <Skills />
      <Contact />
      <BackToTop />
      <ChatBot />
    </main>
  );
}
