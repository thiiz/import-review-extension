import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, Table, ButtonGroup, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';

const ProductUrlModal = ({ show, onHide, onSubmit, reviews }) => {
  const [productUrl, setProductUrl] = useState('');
  const [error, setError] = useState('');
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [activeFilters, setActiveFilters] = useState(['all']);

  // Define filter categories for mutual exclusivity
  const filterCategories = {
    rating: ['5stars', 'positive', 'neutral', 'negative'],
    // Each content filter is in its own category so they can be combined
    withImages: ['withImages'],
    withText: ['withText'],
    detailed: ['detailed']
  };

  // Reset selections when modal opens with new reviews
  useEffect(() => {
    if (show && reviews) {
      setSelectedReviews(reviews.map((_, index) => index));
      setSelectAll(true);
      setActiveFilters(['all']);
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

  // Get the category of a filter
  const getFilterCategory = (filter) => {
    for (const [category, filters] of Object.entries(filterCategories)) {
      if (filters.includes(filter)) {
        return category;
      }
    }
    return null;
  };

  // Toggle a filter in the active filters list
  const toggleFilter = (filterType) => {
    setActiveFilters(prevFilters => {
      // Special handling for 'all' filter
      if (filterType === 'all') {
        return ['all'];
      }

      // Start with removing 'all' if it's present
      let newFilters = prevFilters.filter(f => f !== 'all');

      // If filter is already active, remove it
      if (newFilters.includes(filterType)) {
        newFilters = newFilters.filter(f => f !== filterType);
        // If no filters remain, select 'all'
        return newFilters.length === 0 ? ['all'] : newFilters;
      }
      // Add the filter, removing any incompatible ones
      else {
        // Check if the filter belongs to a category
        const category = getFilterCategory(filterType);

        if (category) {
          // Remove any other filters from the same category
          newFilters = newFilters.filter(f => !filterCategories[category].includes(f));
        }

        return [...newFilters, filterType];
      }
    });
  };

  // Apply active filters whenever they change
  useEffect(() => {
    if (!reviews || reviews.length === 0) return;

    // If 'all' is selected, select all reviews
    if (activeFilters.includes('all')) {
      setSelectedReviews(reviews.map((_, index) => index));
      setSelectAll(true);
      return;
    }

    // Create filter functions for each active filter
    const filterFunctions = {
      positive: (review) => review.rating >= 4,
      negative: (review) => review.rating <= 2,
      neutral: (review) => review.rating === 3,
      withImages: (review) => review.images && review.images.length > 0,
      withText: (review) => review.text && review.text.trim().length > 0,
      detailed: (review) => (review.text && review.text.trim().length > 30) &&
                          (review.images && review.images.length > 0),
      '5stars': (review) => review.rating === 5
    };

    // Get indexes of reviews that match ALL of the selected filters (AND operation)
    const matchingIndexes = reviews
      .map((review, index) => ({ review, index }))
      .filter(({ review }) =>
        activeFilters.every(filter =>
          filterFunctions[filter] && filterFunctions[filter](review)
        )
      )
      .map(item => item.index);

    setSelectedReviews(matchingIndexes);
    setSelectAll(matchingIndexes.length === reviews.length);
  }, [activeFilters, reviews]);

  // Get count for each filter category
  const getFilterCounts = () => {
    if (!reviews) return {};

    const basicCounts = {
      all: reviews.length,
      positive: reviews.filter(review => review.rating >= 4).length,
      negative: reviews.filter(review => review.rating <= 2).length,
      neutral: reviews.filter(review => review.rating === 3).length,
      withImages: reviews.filter(review => review.images && review.images.length > 0).length,
      withText: reviews.filter(review => review.text && review.text.trim().length > 0).length,
      detailed: reviews.filter(review =>
        (review.text && review.text.trim().length > 30) &&
        (review.images && review.images.length > 0)
      ).length,
      '5stars': reviews.filter(review => review.rating === 5).length,
    };

    // If there are active filters that are not 'all', calculate intersection counts
    if (activeFilters.length > 0 && !activeFilters.includes('all')) {
      const filterFunctions = {
        positive: (review) => review.rating >= 4,
        negative: (review) => review.rating <= 2,
        neutral: (review) => review.rating === 3,
        withImages: (review) => review.images && review.images.length > 0,
        withText: (review) => review.text && review.text.trim().length > 0,
        detailed: (review) => (review.text && review.text.trim().length > 30) &&
                            (review.images && review.images.length > 0),
        '5stars': (review) => review.rating === 5
      };

      // Get current filter base
      const currentFilterBase = [...activeFilters];

      // For each filter not in the active set, calculate how many would match if it was added
      Object.keys(filterFunctions).forEach(filter => {
        if (!activeFilters.includes(filter)) {
          // Check if this filter is compatible (not in the same category as an existing filter)
          const category = getFilterCategory(filter);
          const hasConflict = category && activeFilters.some(f => filterCategories[category].includes(f));

          if (hasConflict) {
            basicCounts[filter] = 0; // Set to 0 if there's a conflict
          } else {
            // Calculate intersection with current filters
            basicCounts[filter] = reviews.filter(review =>
              [...currentFilterBase, filter].every(f => filterFunctions[f](review))
            ).length;
          }
        }
      });
    }

    return basicCounts;
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
        style={{ fontSize: '0.7em' }}
      >
        {count} ({percentage}%)
      </Badge>
    );
  };

  // Check if a filter is active
  const isFilterActive = (filterType) => activeFilters.includes(filterType);

  // Check if a filter is disabled (incompatible with current selections)
  const isFilterDisabled = (filterType) => {
    if (activeFilters.includes('all')) return false;
    if (isFilterActive(filterType)) return false;

    // Check if this filter is in a category where another filter is already selected
    const category = getFilterCategory(filterType);
    if (category) {
      return activeFilters.some(filter => filterCategories[category].includes(filter));
    }

    return false;
  };

  // Get button variant based on filter type and active state
  const getButtonVariant = (filterType) => {
    const filterStyles = {
      all: 'primary',
      '5stars': 'primary',
      positive: 'success',
      neutral: 'warning',
      negative: 'danger',
      withImages: 'info',
      withText: 'secondary',
      detailed: 'dark'
    };

    const baseStyle = filterStyles[filterType] || 'primary';
    return isFilterActive(filterType) ? baseStyle : `outline-${baseStyle}`;
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
            <strong>Filtros (combinados com E lógico):</strong>
            <small className="text-muted">
              {selectedReviews.length} de {reviews?.length || 0} avaliações selecionadas
            </small>
          </div>

          <div className="filter-buttons" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '10px' }}>
            <ButtonGroup size="sm" className="flex-wrap">
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Todas as avaliações</Tooltip>}
              >
                <Button
                  variant={getButtonVariant('all')}
                  onClick={() => toggleFilter('all')}
                  className="me-1 mb-1"
                >
                  Todas {createBadge(counts.all, counts.all)}
                </Button>
              </OverlayTrigger>

              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Avaliações com 5 estrelas</Tooltip>}
              >
                <Button
                  variant={getButtonVariant('5stars')}
                  onClick={() => toggleFilter('5stars')}
                  disabled={isFilterDisabled('5stars')}
                  className="me-1 mb-1"
                >
                  5 Estrelas {createBadge(counts['5stars'], counts.all)}
                </Button>
              </OverlayTrigger>

              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Avaliações positivas (4-5 estrelas)</Tooltip>}
              >
                <Button
                  variant={getButtonVariant('positive')}
                  onClick={() => toggleFilter('positive')}
                  disabled={isFilterDisabled('positive')}
                  className="me-1 mb-1"
                >
                  Positivas {createBadge(counts.positive, counts.all)}
                </Button>
              </OverlayTrigger>

              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Avaliações neutras (3 estrelas)</Tooltip>}
              >
                <Button
                  variant={getButtonVariant('neutral')}
                  onClick={() => toggleFilter('neutral')}
                  disabled={isFilterDisabled('neutral')}
                  className="me-1 mb-1"
                >
                  Neutras {createBadge(counts.neutral, counts.all)}
                </Button>
              </OverlayTrigger>

              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Avaliações negativas (1-2 estrelas)</Tooltip>}
              >
                <Button
                  variant={getButtonVariant('negative')}
                  onClick={() => toggleFilter('negative')}
                  disabled={isFilterDisabled('negative')}
                  className="me-1 mb-1"
                >
                  Negativas {createBadge(counts.negative, counts.all)}
                </Button>
              </OverlayTrigger>

              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Avaliações com imagens</Tooltip>}
              >
                <Button
                  variant={getButtonVariant('withImages')}
                  onClick={() => toggleFilter('withImages')}
                  className="me-1 mb-1"
                >
                  Com Imagens {createBadge(counts.withImages, counts.all)}
                </Button>
              </OverlayTrigger>

              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Avaliações com texto</Tooltip>}
              >
                <Button
                  variant={getButtonVariant('withText')}
                  onClick={() => toggleFilter('withText')}
                  className="me-1 mb-1"
                >
                  Com Texto {createBadge(counts.withText, counts.all)}
                </Button>
              </OverlayTrigger>

              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Avaliações detalhadas (com texto longo e imagens)</Tooltip>}
              >
                <Button
                  variant={getButtonVariant('detailed')}
                  onClick={() => toggleFilter('detailed')}
                  disabled={isFilterDisabled('detailed')}
                  className="me-1 mb-1"
                >
                  Detalhadas {createBadge(counts.detailed, counts.all)}
                </Button>
              </OverlayTrigger>
            </ButtonGroup>
          </div>

          <Form.Check
            type="checkbox"
            id="select-all"
            label="Selecionar todas"
            checked={selectAll}
            onChange={handleSelectAll}
            className="mt-2"
          />
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