import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

const ProductUrlModal = ({ show, onHide, onSubmit, reviews }) => {
  const [productUrl, setProductUrl] = useState('');
  const [error, setError] = useState('');
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [activeFilters, setActiveFilters] = useState({
    rating: 'all',
    hasImages: false,
    hasText: false,
    isDetailed: false
  });

  // Reset selections when modal opens with new reviews
  useEffect(() => {
    if (show && reviews) {
      setSelectedReviews(reviews.map((_, index) => index));
      setSelectAll(true);
      setActiveFilters({
        rating: 'all',
        hasImages: false,
        hasText: false,
        isDetailed: false
      });
    }
  }, [show, reviews]);

  const validateUrl = (url) => {
    if (!url) {
      return 'A URL do produto é obrigatória';
    }
    return '';
  };

  const handleSubmit = () => {
    const validationError = validateUrl(productUrl);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Filter reviews based on selected indexes
    const selectedReviewsData = selectedReviews.map(index => reviews[index]);

    onSubmit(productUrl, selectedReviewsData);
    setProductUrl('');
    setError('');
  };

  const toggleReview = (index) => {
    setSelectedReviews(prevSelected => {
      if (prevSelected.includes(index)) {
        const newSelected = prevSelected.filter(i => i !== index);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prevSelected, index];
        if (newSelected.length === reviews.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(reviews.map((_, index) => index));
    }
    setSelectAll(!selectAll);
  };

  // Apply filters whenever they change
  useEffect(() => {
    if (!reviews || reviews.length === 0) return;

    const matchingIndexes = reviews
      .map((review, index) => ({ review, index }))
      .filter(({ review }) => {
        // Rating filter
        let ratingMatch = true;
        if (activeFilters.rating === 'positive') {
          ratingMatch = review.rating >= 4;
        } else if (activeFilters.rating === 'neutral') {
          ratingMatch = review.rating === 3;
        } else if (activeFilters.rating === 'negative') {
          ratingMatch = review.rating <= 2;
        } else if (activeFilters.rating === '5stars') {
          ratingMatch = review.rating === 5;
        }

        // Content filters - only apply if they're turned on
        const imageMatch = !activeFilters.hasImages || (review.images && review.images.length > 0);
        const textMatch = !activeFilters.hasText || (review.text && review.text.trim().length > 0);
        const detailedMatch = !activeFilters.isDetailed ||
          ((review.text && review.text.trim().length > 30) && (review.images && review.images.length > 0));

        return ratingMatch && imageMatch && textMatch && detailedMatch;
      })
      .map(item => item.index);

    setSelectedReviews(matchingIndexes);
    setSelectAll(matchingIndexes.length === reviews.length);
  }, [activeFilters, reviews]);

  // Get counts for each filter
  const getFilterCounts = () => {
    if (!reviews) return {};

    return {
      all: reviews.length,
      positive: reviews.filter(review => review.rating >= 4).length,
      negative: reviews.filter(review => review.rating <= 2).length,
      neutral: reviews.filter(review => review.rating === 3).length,
      '5stars': reviews.filter(review => review.rating === 5).length,
      withImages: reviews.filter(review => review.images && review.images.length > 0).length,
      withText: reviews.filter(review => review.text && review.text.trim().length > 0).length,
      detailed: reviews.filter(review =>
        (review.text && review.text.trim().length > 30) &&
        (review.images && review.images.length > 0)
      ).length
    };
  };

  const counts = getFilterCounts();

  // Truncate text to a certain length
  const truncateText = (text, maxLength = 50) => {
    if (!text) return 'Sem texto';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Helper to create badge with count
  const createBadge = (count, total) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded px-2 py-0.5">
        {count} ({percentage}%)
      </span>
    );
  };

  const handleRatingFilterChange = (rating) => {
    setActiveFilters(prev => ({
      ...prev,
      rating
    }));
  };

  const toggleContentFilter = (filterName) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  const resetFilters = () => {
    setActiveFilters({
      rating: 'all',
      hasImages: false,
      hasText: false,
      isDetailed: false
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Exportar Avaliações</h2>
            <button
              onClick={onHide}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <p className="mb-4">Informe a URL do produto para incluir no arquivo CSV de exportação:</p>
          <div className="mb-6">
            <div className="flex flex-col space-y-2">
              <input
                type="url"
                placeholder="https://..."
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  error ? 'border-destructive' : 'border-input'
                } bg-background`}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Filtros</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedReviews.length} de {reviews?.length || 0} avaliações selecionadas
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                >
                  Limpar filtros
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-md">
                <div className="bg-muted px-4 py-2 font-medium">
                  Classificação
                </div>
                <div className="p-3 space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ratingFilter"
                      checked={activeFilters.rating === 'all'}
                      onChange={() => handleRatingFilterChange('all')}
                      className="h-4 w-4"
                    />
                    <span>Todas {createBadge(counts.all, counts.all)}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ratingFilter"
                      checked={activeFilters.rating === '5stars'}
                      onChange={() => handleRatingFilterChange('5stars')}
                      className="h-4 w-4"
                    />
                    <span>5 Estrelas {createBadge(counts['5stars'], counts.all)}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ratingFilter"
                      checked={activeFilters.rating === 'positive'}
                      onChange={() => handleRatingFilterChange('positive')}
                      className="h-4 w-4"
                    />
                    <span>Positivas (4-5★) {createBadge(counts.positive, counts.all)}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ratingFilter"
                      checked={activeFilters.rating === 'neutral'}
                      onChange={() => handleRatingFilterChange('neutral')}
                      className="h-4 w-4"
                    />
                    <span>Neutras (3★) {createBadge(counts.neutral, counts.all)}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ratingFilter"
                      checked={activeFilters.rating === 'negative'}
                      onChange={() => handleRatingFilterChange('negative')}
                      className="h-4 w-4"
                    />
                    <span>Negativas (1-2★) {createBadge(counts.negative, counts.all)}</span>
                  </label>
                </div>
              </div>

              <div className="border rounded-md">
                <div className="bg-muted px-4 py-2 font-medium">
                  Conteúdo
                </div>
                <div className="p-3 space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={activeFilters.hasImages}
                      onChange={() => toggleContentFilter('hasImages')}
                      className="h-4 w-4"
                    />
                    <span>Com imagens {createBadge(counts.withImages, counts.all)}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={activeFilters.hasText}
                      onChange={() => toggleContentFilter('hasText')}
                      className="h-4 w-4"
                    />
                    <span>Com texto {createBadge(counts.withText, counts.all)}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={activeFilters.isDetailed}
                      onChange={() => toggleContentFilter('isDetailed')}
                      className="h-4 w-4"
                    />
                    <span>Detalhadas {createBadge(counts.detailed, counts.all)}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-md mt-4 overflow-hidden">
            <div className="bg-muted px-4 py-2 flex items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="h-4 w-4"
                />
                <span className="font-medium">Selecionar todas</span>
              </label>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="w-12 px-4 py-2"></th>
                    <th className="px-4 py-2 text-left">Avaliação</th>
                    <th className="px-4 py-2 text-left">Comentário</th>
                    <th className="px-4 py-2 text-center">Imagens</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review, index) => (
                    <tr key={index} className={`border-t ${selectedReviews.includes(index) ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedReviews.includes(index)}
                          onChange={() => toggleReview(index)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < review.rating ? "text-amber-500" : "text-gray-300"}>★</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">{truncateText(review.text)}</td>
                      <td className="px-4 py-2 text-center">
                        {review.images && review.images.length > 0 ? review.images.length : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={onHide}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductUrlModal;