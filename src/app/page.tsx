import { Hero } from '@/components/sections/Hero/Hero';
import { Summary } from '@/components/sections/Summary/Summary';
import { Experience } from '@/components/sections/Experience/Experience';
import { Skills } from '@/components/sections/Skills/Skills';
import { Projects } from '@/components/sections/Projects/Projects';
import { Contact } from '@/components/sections/Contact/Contact';
import { BackToTop } from '@/components/ui/BackToTop/BackToTop';
import { Footer } from '@/components/ui/Footer/Footer';
import styles from '@/components/sections/Hero/Hero.module.scss';

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.heroGroup}>
        <Hero />
        <Summary />
      </div>
      <Experience />
      <Skills />
      <Projects />
      <Contact />
      <BackToTop />
      <Footer />
    </main>
  );
}
