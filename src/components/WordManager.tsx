import { useMemo, useState } from 'react';
import {
  App as AntApp,
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  Popconfirm,
  Space,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import type { IWord } from '../types';
import { addPair, buildPairs, deleteWordWithLinks, importPairs } from '../db';
import { parseImport } from '../parseImport';

const { Text } = Typography;

interface Props {
  dictionaryId: string;
  words: IWord[];
  onChange: () => void;
}

interface FormValues {
  value: string;
  valueDescription?: string;
  translation: string;
  translationDescription?: string;
}

export default function WordManager({ dictionaryId, words, onChange }: Props) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);

  const pairs = useMemo(() => buildPairs(words), [words]);

  const handleAdd = async (values: FormValues) => {
    setSaving(true);
    try {
      await addPair({ ...values, dictionaryId });
      form.resetFields();
      onChange();
      message.success('Слово добавлено');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteWordWithLinks(id);
    onChange();
    message.success('Удалено');
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseImport(text);
      const added = await importPairs(dictionaryId, parsed);
      onChange();
      message.success(`Импортировано пар: ${added}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Не удалось импортировать файл');
    }
    return false; // не загружаем файл на сервер
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="Добавить слово">
        <Form form={form} layout="vertical" onFinish={handleAdd} requiredMark={false}>
          <Space size="large" align="start" wrap style={{ width: '100%' }}>
            <Space direction="vertical" style={{ minWidth: 260 }}>
              <Form.Item
                name="value"
                label="Слово"
                rules={[{ required: true, message: 'Введите слово' }]}
                style={{ marginBottom: 12 }}
              >
                <Input placeholder="apple" autoComplete="off" />
              </Form.Item>
              <Form.Item name="valueDescription" label="Комментарий" style={{ marginBottom: 0 }}>
                <Input placeholder="существительное" autoComplete="off" />
              </Form.Item>
            </Space>
            <Space direction="vertical" style={{ minWidth: 260 }}>
              <Form.Item
                name="translation"
                label="Перевод"
                rules={[{ required: true, message: 'Введите перевод' }]}
                style={{ marginBottom: 12 }}
              >
                <Input placeholder="яблоко" autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="translationDescription"
                label="Комментарий"
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="фрукт" autoComplete="off" />
              </Form.Item>
            </Space>
          </Space>
          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={saving}>
              Добавить
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={`Мои слова (${pairs.length})`}
        extra={
          <Upload accept=".json" showUploadList={false} beforeUpload={handleImport}>
            <Button icon={<UploadOutlined />}>Импорт JSON</Button>
          </Upload>
        }
      >
        {pairs.length === 0 ? (
          <Empty description="Пока пусто — добавьте первое слово" />
        ) : (
          <List
            dataSource={pairs}
            renderItem={({ word, translation }) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="del"
                    title="Удалить пару?"
                    okText="Да"
                    cancelText="Нет"
                    onConfirm={() => handleDelete(word.id)}
                  >
                    <Button danger type="text" icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <Space size="middle" wrap>
                  <Text strong>{word.value}</Text>
                  {word.description && <Tag>{word.description}</Tag>}
                  <Text type="secondary">→</Text>
                  <Text>{translation.value}</Text>
                  {translation.description && <Tag color="blue">{translation.description}</Tag>}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}
