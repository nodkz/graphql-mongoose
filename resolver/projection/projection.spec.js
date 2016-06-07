import {expect} from 'chai';
import projection from './';

describe('projection', () => {
  it('should return an object of fields (\'Field\' fragment)', () => {
    const context = {
      fieldASTs: {
        kind: 'Field',
        name: {value: 'foo'},
        selectionSet: {
          selections: [{
            kind: 'Field',
            name: {value: 'bar'},
            selectionSet: {
              selections: [{
                kind: 'Field',
                name: {value: 'baz'}
              }]
            }
          }]
        }
      }
    };
    const fields = projection(context);
    expect(fields).to.be.eql({
      bar: true,
      baz: true
    });
  });

  it('should return an object of fields (\'InlineFragment\' fragment)');
  it('should return an object of fields (\'FragmentSpread\' fragment)');
});
