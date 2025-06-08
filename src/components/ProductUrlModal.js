import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, Table, Badge, Card, Row, Col } from 'react-bootstrap';

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
      <Badge
        bg="secondary"
        className="ms-1"
      >
        {count} ({percentage}%)
      </Badge>
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

  return (
    <Modal show={show} onHide={onHide} centered size="lg" dialogClassName="export-modal">
      <Modal.Header closeButton>
        <Modal.Title>Exportar Avaliações</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Informe a URL do produto para incluir no arquivo CSV de exportação:</p>
        <Form className="mb-4">
          <InputGroup>
            <Form.Control
              type="url"
              placeholder="https://..."
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              isInvalid={!!error}
            />
          </InputGroup>
          {error && <Form.Text className="text-danger">{error}</Form.Text>}
        </Form>

        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Filtros</h5>
            <div>
              <small className="text-muted me-2">
                {selectedReviews.length} de {reviews?.length || 0} avaliações selecionadas
              </small>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={resetFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </div>

          <Row>
            <Col md={6} className="mb-3">
              <Card>
                <Card.Header className="py-2">
                  <strong>Classificação</strong>
                </Card.Header>
                <Card.Body className="py-2">
                  <Form>
                    <Form.Check
                      type="radio"
                      name="ratingFilter"
                      id="filter-all"
                      label={<>Todas {createBadge(counts.all, counts.all)}</>}
                      checked={activeFilters.rating === 'all'}
                      onChange={() => handleRatingFilterChange('all')}
                      className="mb-1"
                    />
                    <Form.Check
                      type="radio"
                      name="ratingFilter"
                      id="filter-5stars"
                      label={<>5 Estrelas {createBadge(counts['5stars'], counts.all)}</>}
                      checked={activeFilters.rating === '5stars'}
                      onChange={() => handleRatingFilterChange('5stars')}
                      className="mb-1"
                    />
                    <Form.Check
                      type="radio"
                      name="ratingFilter"
                      id="filter-positive"
                      label={<>Positivas (4-5★) {createBadge(counts.positive, counts.all)}</>}
                      checked={activeFilters.rating === 'positive'}
                      onChange={() => handleRatingFilterChange('positive')}
                      className="mb-1"
                    />
                    <Form.Check
                      type="radio"
                      name="ratingFilter"
                      id="filter-neutral"
                      label={<>Neutras (3★) {createBadge(counts.neutral, counts.all)}</>}
                      checked={activeFilters.rating === 'neutral'}
                      onChange={() => handleRatingFilterChange('neutral')}
                      className="mb-1"
                    />
                    <Form.Check
                      type="radio"
                      name="ratingFilter"
                      id="filter-negative"
                      label={<>Negativas (1-2★) {createBadge(counts.negative, counts.all)}</>}
                      checked={activeFilters.rating === 'negative'}
                      onChange={() => handleRatingFilterChange('negative')}
                    />
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} className="mb-3">
              <Card>
                <Card.Header className="py-2">
                  <strong>Conteúdo</strong>
                </Card.Header>
                <Card.Body className="py-2">
                  <Form>
                    <Form.Check
                      type="switch"
                      id="filter-images"
                      label={<>Com Imagens {createBadge(counts.withImages, counts.all)}</>}
                      checked={activeFilters.hasImages}
                      onChange={() => toggleContentFilter('hasImages')}
                      className="mb-2"
                    />
                    <Form.Check
                      type="switch"
                      id="filter-text"
                      label={<>Com Texto {createBadge(counts.withText, counts.all)}</>}
                      checked={activeFilters.hasText}
                      onChange={() => toggleContentFilter('hasText')}
                      className="mb-2"
                    />
                    <Form.Check
                      type="switch"
                      id="filter-detailed"
                      label={<>Detalhadas {createBadge(counts.detailed, counts.all)}</>}
                      checked={activeFilters.isDetailed}
                      onChange={() => toggleContentFilter('isDetailed')}
                      className="mb-2"
                    />
                  </Form>
                </Card.Body>
              </Card>

              <Form.Check
                type="checkbox"
                id="select-all"
                label="Selecionar todas"
                checked={selectAll}
                onChange={handleSelectAll}
                className="mt-2"
              />
            </Col>
          </Row>
        </div>

        <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th style={{ width: '50px' }}></th>
                <th style={{ width: '100px' }}>Avaliador</th>
                <th>Avaliação</th>
                <th style={{ width: '80px' }}>Estrelas</th>
                <th style={{ width: '80px' }}>Imagens</th>
              </tr>
            </thead>
            <tbody>
              {reviews && reviews.map((review, index) => (
                <tr key={index}>
                  <td className="text-center">
                    <Form.Check
                      type="checkbox"
                      id={`review-${index}`}
                      checked={selectedReviews.includes(index)}
                      onChange={() => toggleReview(index)}
                    />
                  </td>
                  <td>{review.name ? truncateText(review.name, 20) : 'N/A'}</td>
                  <td>{truncateText(review.text)}</td>
                  <td className="text-center">{review.rating}/5</td>
                  <td className="text-center">{review.images?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={selectedReviews.length === 0}
        >
          Exportar {selectedReviews.length} Avaliação(ões)
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProductUrlModal;