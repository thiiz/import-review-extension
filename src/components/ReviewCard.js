import React, { useState } from 'react';
import { Card, Modal } from 'react-bootstrap';

const ReviewCard = ({ review }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} style={{ color: i < rating ? '#ff9800' : '#e0e0e0' }}>
          ★
        </span>
      );
    }
    return stars;
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  return (
    <>
      <Card className="review-card">
        <Card.Body>
          <Card.Title>{review.name}</Card.Title>
          <div className="rating">
            {renderStars(review.rating)}
          </div>
          <Card.Text>{review.text || 'Sem texto na avaliação.'}</Card.Text>

          {review.images && review.images.length > 0 && (
            <div className="review-images">
              {review.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Review image ${index + 1}`}
                  className="review-image"
                  onClick={() => handleImageClick(image)}
                />
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Image Modal */}
      <Modal show={!!selectedImage} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Imagem da Avaliação</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Review full size"
              style={{ width: '100%', height: 'auto' }}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ReviewCard;