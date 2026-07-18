import { useCallback, useEffect, useState } from 'react';
import { App as AntApp, Button, ConfigProvider, Layout, Tabs, Typography } from 'antd';
import { ArrowLeftOutlined, BookOutlined, ThunderboltOutlined } from '@ant-design/icons';
import ruRU from 'antd/locale/ru_RU';
import type { IDictionary, IWord } from './types';
import { getAllDictionaries, getWordsByDictionary } from './db';
import DictionaryList from './components/DictionaryList';
import WordManager from './components/WordManager';
import Study from './components/Study';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function App() {
  const [dictionaries, setDictionaries] = useState<IDictionary[]>([]);
  const [active, setActive] = useState<IDictionary | null>(null);
  const [words, setWords] = useState<IWord[]>([]);

  const reloadDictionaries = useCallback(async () => {
    setDictionaries(await getAllDictionaries());
  }, []);

  const reloadWords = useCallback(async () => {
    if (active) setWords(await getWordsByDictionary(active.id));
  }, [active]);

  useEffect(() => {
    reloadDictionaries();
  }, [reloadDictionaries]);

  useEffect(() => {
    if (active) reloadWords();
    else setWords([]);
  }, [active, reloadWords]);

  return (
    <ConfigProvider locale={ruRU} theme={{ token: { colorPrimary: '#5b8def' } }}>
      <AntApp>
        <Layout style={{ height: '100%', overflow: 'hidden' }}>
          <Header style={{ background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
            {active && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => setActive(null)}
              />
            )}
            <Title level={3} style={{ margin: 0 }}>
              📚 Nudo{active ? ` — ${active.name}` : ' — тренажёр слов'}
            </Title>
          </Header>
          <Content
            style={{
              padding: 24,
              maxWidth: 820,
              margin: '0 auto',
              width: '100%',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {!active ? (
              <DictionaryList
                dictionaries={dictionaries}
                onChange={reloadDictionaries}
                onOpen={setActive}
              />
            ) : (
              <Tabs
                defaultActiveKey="study"
                size="large"
                items={[
                  {
                    key: 'study',
                    label: (
                      <span>
                        <ThunderboltOutlined /> Тренировка
                      </span>
                    ),
                    children: <Study words={words} />,
                  },
                  {
                    key: 'words',
                    label: (
                      <span>
                        <BookOutlined /> Мои слова
                      </span>
                    ),
                    children: (
                      <WordManager
                        dictionaryId={active.id}
                        words={words}
                        onChange={reloadWords}
                      />
                    ),
                  },
                ]}
              />
            )}
          </Content>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}
