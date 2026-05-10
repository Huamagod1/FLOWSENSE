import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Modal, Form, Input, Select, Popconfirm, Table, Button, Tag } from 'antd'
import api from '../api/axiosConfig'

const TIPOS = ['MALL', 'GALERIA', 'FERIA', 'OTRO']

export default function RecintosPage() {
  const [recintos, setRecintos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [error, setError] = useState('')
  const [form] = Form.useForm()

  useEffect(() => { cargar() }, [])

  function cargar() {
    setCargando(true)
    api.get('/recintos')
      .then(res => setRecintos(res.data))
      .catch(() => setError('Error al cargar recintos'))
      .finally(() => setCargando(false))
  }

  function abrirCrear() {
    setEditando(null)
    form.resetFields()
    setModalAbierto(true)
  }

  function abrirEditar(recinto) {
    setEditando(recinto)
    form.setFieldsValue(recinto)
    setModalAbierto(true)
  }

  async function guardar() {
    try {
      const valores = await form.validateFields()
      if (editando) {
        await api.put(`/recintos/${editando.id}`, valores)
      } else {
        await api.post('/recintos', valores)
      }
      setModalAbierto(false)
      cargar()
    } catch (err) {
      if (err?.errorFields) return
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  async function eliminar(id) {
    try {
      await api.delete(`/recintos/${id}`)
      cargar()
    } catch {
      setError('Error al eliminar recinto')
    }
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre',
      render: (text, row) => <Link to={`/app/recintos/${row.id}`} className="link">{text}</Link> },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo',
      render: t => <Tag>{t}</Tag> },
    { title: 'Dirección', dataIndex: 'direccion', key: 'direccion' },
    { title: 'Acciones', key: 'acciones',
      render: (_, row) => (
        <div className="table-actions">
          <Button size="small" onClick={() => abrirEditar(row)}>Editar</Button>
          <Popconfirm
            title="¿Eliminar este recinto?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => eliminar(row.id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
          >
            <Button size="small" danger>Eliminar</Button>
          </Popconfirm>
        </div>
      )
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Recintos</h2>
          <p className="text-muted">Gestiona tus recintos comerciales</p>
        </div>
        <Button type="primary" onClick={abrirCrear}>+ Nuevo recinto</Button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <Table
        dataSource={recintos}
        columns={columns}
        rowKey="id"
        loading={cargando}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editando ? 'Editar recinto' : 'Nuevo recinto'}
        open={modalAbierto}
        onOk={guardar}
        onCancel={() => setModalAbierto(false)}
        okText={editando ? 'Guardar cambios' : 'Crear'}
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'El nombre es requerido' }]}>
            <Input placeholder="Nombre del recinto" />
          </Form.Item>
          <Form.Item name="tipo" label="Tipo" rules={[{ required: true, message: 'Selecciona un tipo' }]}>
            <Select placeholder="Selecciona tipo">
              {TIPOS.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="direccion" label="Dirección" rules={[{ required: true, message: 'La dirección es requerida' }]}>
            <Input placeholder="Av. Principal 123, Santiago" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
