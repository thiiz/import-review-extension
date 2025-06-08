import React, { useState } from 'react';
import ReviewForm from './components/ReviewForm';
import ReviewList from './components/ReviewList';
import { Button } from './components/ui/button';

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">AliExpress Review Scraper</h1>
          <p className="text-muted-foreground">Digite a URL de um produto do AliExpress para visualizar as avaliações</p>
        </header>

        <div className="max-w-3xl mx-auto">
          <ReviewForm
            onReviewsFetched={handleReviewsFetched}
            setLoading={setLoading}
            setError={setError}
            setSuccess={setSuccess}
          />

          {error && (
            <div className="p-4 my-4 bg-destructive/10 border border-destructive rounded-md text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 my-4 bg-primary/10 border border-primary rounded-md text-primary">
              {success}
            </div>
          )}
        </div>

        <ReviewList reviews={reviews} loading={loading} />
      </div>
    </div>
  );
}

export default App;