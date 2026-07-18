import { useEffect, useState } from 'react';
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import { DeleteOutlined, FolderOpenOutlined, PlusOutlined } from '@ant-design/icons';
import type { IDictionary } from '../types';
import { addDictionary, deleteDictionary, getWordCounts } from '../db';

const { Text, Paragraph } = Typography;

interface Props {
  dictionaries: IDictionary[];
  onChange: () => void;
  onOpen: (dict: IDictionary) => void;
}

interface FormValues {
  name: string;
  description?: string;
}

export default function DictionaryList({ dictionaries, onChange, onOpen }: Props) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<FormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    getWordCounts().then(setCounts);
  }, [dictionaries]);

  const handleCreate = async (values: FormValues) => {
    await addDictionary(values);
    form.resetFields();
    setModalOpen(false);
    onChange();
    message.success('Словарь создан');
  };

  const handleDelete = async (id: string) => {
    await deleteDictionary(id);
    onChange();
    message.success('Словарь удалён');
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Словари
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Новый словарь
        </Button>
      </Space>

      {dictionaries.length === 0 ? (
        <Empty description="Пока нет словарей — создайте первый" />
      ) : (
        <Row gutter={[16, 16]}>
          {dictionaries.map((dict) => (
            <Col key={dict.id} xs={24} sm={12}>
              <Card
                hoverable
                onClick={() => onOpen(dict)}
                style={{ position: 'relative' }}
              >
                <Popconfirm
                  title="Удалить словарь?"
                  description="Все слова внутри будут удалены."
                  okText="Да"
                  cancelText="Нет"
                  onConfirm={() => handleDelete(dict.id)}
                  onPopupClick={(e) => e.stopPropagation()}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 8, right: 8 }}
                  />
                </Popconfirm>
                <Card.Meta
                  avatar={<FolderOpenOutlined style={{ fontSize: 24, color: '#5b8def' }} />}
                  title={dict.name}
                  description={
                    <Space direction="vertical" size={4}>
                      {dict.description && (
                        <Paragraph
                          type="secondary"
                          ellipsis={{ rows: 2 }}
                          style={{ margin: 0 }}
                        >
                          {dict.description}
                        </Paragraph>
                      )}
                      <Tag>{counts[dict.id] ?? 0} слов</Tag>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="Новый словарь"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Создать"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} requiredMark={false}>
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Английский — базовый" autoComplete="off" autoFocus />
          </Form.Item>
          <Form.Item name="description" label="Описание" style={{ marginBottom: 0 }}>
            <Input.TextArea placeholder="Необязательно" rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Text type="secondary" style={{ fontSize: 12 }}>
        Данные хранятся локально в браузере (IndexedDB).
      </Text>
    </Space>
  );
}
