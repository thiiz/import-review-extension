import React, { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';

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
      const response = await axios.post('http://localhost:5000/api/scrape-reviews', { url });

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
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="url" className="block text-sm font-medium text-foreground">
            URL do Produto AliExpress
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              id="url"
              className={`flex-1 h-10 px-3 py-2 bg-background text-foreground rounded-md border ${
                urlError ? 'border-destructive' : 'border-input'
              } focus:outline-none focus:ring-2 focus:ring-ring`}
              placeholder="https://pt.aliexpress.com/item/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button type="submit">
              Obter Avaliações
            </Button>
          </div>
          {urlError && <p className="text-sm text-destructive">{urlError}</p>}
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;