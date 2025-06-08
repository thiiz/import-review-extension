import React, { useState } from 'react';
import ReviewCard from './ReviewCard';
import ProductUrlModal from './ProductUrlModal';
import axios from 'axios';
import { Button } from './ui/button';

const ReviewList = ({ reviews, loading }) => {
  const [showUrlModal, setShowUrlModal] = useState(false);

  const handleExportClick = () => {
    setShowUrlModal(true);
  };

  const handleModalClose = () => {
    setShowUrlModal(false);
  };

  const handleExportCSV = async (productUrl, selectedReviews) => {
    try {
      const response = await axios.post('/api/export-reviews', {
        reviews: selectedReviews,
        productUrl
      }, {
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
      setShowUrlModal(false);
    } catch (error) {
      console.error('Erro ao exportar avaliações:', error);
      alert('Ocorreu um erro ao exportar as avaliações. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-muted-foreground">Obtendo avaliações. Isso pode levar alguns segundos...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Avaliações ({reviews.length})</h2>
        <Button
          onClick={handleExportClick}
          disabled={reviews.length === 0}
          variant="secondary"
        >
          Exportar CSV
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((review, index) => (
          <ReviewCard key={index} review={review} />
        ))}
      </div>

      <ProductUrlModal
        show={showUrlModal}
        onHide={handleModalClose}
        onSubmit={handleExportCSV}
        reviews={reviews}
      />
    </div>
  );
};

export default ReviewList;