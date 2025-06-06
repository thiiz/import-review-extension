import React from 'react';
import { Row, Col, Spinner, Button } from 'react-bootstrap';
import ReviewCard from './ReviewCard';
import axios from 'axios';

const ReviewList = ({ reviews, loading }) => {
  const handleExportCSV = async () => {
    try {
      const response = await axios.post('/api/export-reviews', { reviews }, {
        responseType: 'blob', // Important for file download
      });

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'avaliacoes.csv');
      document.body.appendChild(link);
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar avaliações:', error);
      alert('Ocorreu um erro ao exportar as avaliações. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="loader">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
        <p>Obtendo avaliações. Isso pode levar alguns segundos...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="reviews-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Avaliações ({reviews.length})</h2>
        <Button
          variant="success"
          onClick={handleExportCSV}
          disabled={reviews.length === 0}
        >
          Exportar CSV
        </Button>
      </div>
      <Row>
        {reviews.map((review, index) => (
          <Col md={6} lg={4} key={index}>
            <ReviewCard review={review} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ReviewList;