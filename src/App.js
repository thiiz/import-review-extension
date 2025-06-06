import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import ReviewForm from './components/ReviewForm';
import ReviewList from './components/ReviewList';
import './styles/index.css';

function App() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleReviewsFetched = (data) => {
    setReviews(data.reviews);
    setSuccess(`Foram encontradas ${data.count} avaliações para o produto.`);
  };

  return (
    <div className="app-container">
      <Container>
        <Row className="justify-content-center">
          <Col>
            <header className="header">
              <h1>AliExpress Review Scraper</h1>
              <p>Digite a URL de um produto do AliExpress para visualizar as avaliações</p>
            </header>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col md={8}>
            <ReviewForm
              onReviewsFetched={handleReviewsFetched}
              setLoading={setLoading}
              setError={setError}
              setSuccess={setSuccess}
            />

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                {success}
              </div>
            )}
          </Col>
        </Row>

        <ReviewList reviews={reviews} loading={loading} />
      </Container>
    </div>
  );
}

export default App;