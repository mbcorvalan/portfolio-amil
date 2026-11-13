import { Header } from '@/components/ui/Header/Header';
import { HandbookSidebar } from '@/components/handbook/HandbookSidebar';
import { getDocsNav, HANDBOOK_TITLE } from '@/lib/docs';
import styles from '@/components/handbook/Handbook.module.scss';
import '@/components/handbook/prose.scss';

export default function HandbookLayout({ children }: { children: React.ReactNode }) {
  const nav = getDocsNav();

  return (
    <div className={styles.root}>
      <div className={styles.headerWrap}>
        <Header variant="page" />
      </div>
      <div className={styles.shell}>
        <HandbookSidebar nav={nav} title={HANDBOOK_TITLE} />
        {children}
      </div>
    </div>
  );
}
