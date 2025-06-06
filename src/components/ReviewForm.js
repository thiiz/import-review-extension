import React, { useState } from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';
import axios from 'axios';

const ReviewForm = ({ onReviewsFetched, setLoading, setError, setSuccess }) => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  const validateUrl = (value) => {
    if (!value) {
      return 'A URL é obrigatória';
    }
    if (!value.includes('aliexpress.com')) {
      return 'A URL deve ser de um produto do AliExpress';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate URL
    const error = validateUrl(url);
    setUrlError(error);

    if (error) {
      return;
    }

    // Reset states
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.post('/api/scrape-reviews', { url });

      if (response.data.success) {
        onReviewsFetched(response.data);
      } else {
        setError('Ocorreu um erro ao tentar obter as avaliações. Tente novamente.');
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Ocorreu um erro ao tentar obter as avaliações. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="url-form">
      <Form onSubmit={handleSubmit}>
        <Form.Group>
          <Form.Label>URL do Produto AliExpress</Form.Label>
          <InputGroup>
            <Form.Control
              type="url"
              placeholder="https://pt.aliexpress.com/item/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              isInvalid={!!urlError}
            />
            <Button variant="primary" type="submit">
              Obter Avaliações
            </Button>
          </InputGroup>
          {urlError && <Form.Text className="text-danger">{urlError}</Form.Text>}
        </Form.Group>
      </Form>
    </div>
  );
};

export default ReviewForm;